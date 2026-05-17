export function getTextWidth(text, font = '14px sans-serif') {
    // Force canvas resolution
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.style.width = '1000px';
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(text).width;
}