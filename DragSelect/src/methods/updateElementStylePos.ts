/** Updates element style left, top, width, height values according to pos input object */
export default (
  element: HTMLElement,
  pos: { left?: number; top?: number; width?: number; height?: number }
) => {
  if (pos.left !== undefined) element.style.left = `${pos.left}px`
  if (pos.top !== undefined) element.style.top = `${pos.top}px`
  if (pos.width !== undefined) element.style.width = `${pos.width}px`
  if (pos.height !== undefined) element.style.height = `${pos.height}px`
}
