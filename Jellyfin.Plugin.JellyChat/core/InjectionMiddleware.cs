using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.JellyChat.Infrastructure;

public sealed class InjectionMiddleware
{
    private readonly RequestDelegate _next;

    public InjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!ShouldInspect(context.Request))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        HttpRequest request = context.Request;
        request.Headers.Remove("Accept-Encoding");
        request.Headers.Remove("If-None-Match");
        request.Headers.Remove("If-Modified-Since");

        HttpResponse response = context.Response;
        Stream originalBody = response.Body;
        using MemoryStream buffer = new MemoryStream();
        response.Body = buffer;

        try
        {
            await _next(context).ConfigureAwait(false);

            if (TryBuildInjectedHtml(response, buffer, out byte[]? injected) && injected is not null)
            {
                response.Headers.Remove("ETag");
                response.Headers.Remove("Last-Modified");
                response.Headers.CacheControl = "no-cache";
                response.ContentLength = injected.Length;
                response.Body = originalBody;
                await originalBody.WriteAsync(injected).ConfigureAwait(false);
                return;
            }

            response.Body = originalBody;
            buffer.Seek(0, SeekOrigin.Begin);
            await buffer.CopyToAsync(originalBody).ConfigureAwait(false);
        }
        finally
        {
            response.Body = originalBody;
        }
    }

    private static bool TryBuildInjectedHtml(HttpResponse response, MemoryStream buffer, out byte[]? injected)
    {
        injected = null;

        if (response.StatusCode != StatusCodes.Status200OK || response.ContentType is not string contentType || !contentType.Contains("text/html", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        string html = Encoding.UTF8.GetString(buffer.GetBuffer(), 0, (int)buffer.Length);
        string version = Plugin.Instance?.Version.ToString() ?? "0";

        string? transformed = WebTransformer.TransformIndexHtml(html, version);
        if (transformed is null) return false;

        injected = Encoding.UTF8.GetBytes(transformed);
        return true;
    }

    private static bool ShouldInspect(HttpRequest request)
    {
        if (!HttpMethods.IsGet(request.Method)) return false;

        string path = request.Path.Value ?? string.Empty;
        return path.EndsWith("index.html", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase);
    }
}
