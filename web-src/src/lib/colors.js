export const NICK_COLORS = [
    '#e17076', '#eda86c', '#a695e7', '#7bc862',
    '#6ec9cb', '#65aadd', '#ee7aae', '#f0c44c',
    '#d4806b', '#7ec1b0', '#b48ad3', '#79b3e0',
    '#c98fb0', '#8bbf6a', '#d98f8f', '#6fa8c7'
]

const assigned = new Map()

export const getNickColor = (name) =>
{
    if (!name) return NICK_COLORS[0]
    if (assigned.has(name)) return assigned.get(name)

    const color = NICK_COLORS[Math.floor(Math.random() * NICK_COLORS.length)]
    assigned.set(name, color)
    return color
}
