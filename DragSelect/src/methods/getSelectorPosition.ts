import { DSBoundingRect, Vect2 } from '../types'

type Params = {
  scrollAmount: Vect2
  initialPointerPos: Vect2
  pointerPos: Vect2
  containerSize?: {
    top: number
    left: number
    width: number
    height: number
  }
}

/** Reliably returns the exact x,y,w,h positions of the selector element */
export const getSelectorPosition = ({
  scrollAmount,
  initialPointerPos,
  pointerPos,
  containerSize,
}: Params) => {
  /** check for direction
   *
   * This is quite complicated, so also quite complicated to explain. Lemme’ try:
   *
   * Problem #1:
   * Sadly in HTML we can not have negative sizes.
   * so if we want to scale our element 10px to the right then it is easy,
   * we just have to add +10px to the width. But if we want to scale the element
   * -10px to the left then things become more complicated, we have to move
   * the element -10px to the left on the x axis and also scale the element
   * by +10px width to fake a negative sizing.
   *
   * One solution to this problem is using css-transforms scale() with
   * transform-origin of top left. BUT we can’t use this since it will size
   * everything, then when your element has a border for example, the border will
   * get inanely huge. Also transforms are not widely supported in IE.
   *
   * Example #1:
   * Unfortunately, things get even more complicated when we are inside a scroll-able
   * DIV. Then, let’s say we scroll to the right by 10px and move the cursor right by 5px in our
   * checks we have to subtract 10px from the initialcursor position in our check
   * (since the initial position is moved to the left by 10px) so in our example:
   * 1. pointerPos.x (5) > initialPointerPos.x (0) - scrollAmount.x (10) === 5 > -10 === true
   * then set the x position to the cursors start position
   * selectorPos.x = initialPointerPos.x (0) - scrollAmount.x (10) === 10 // 2.
   * then we can calculate the elements width, which is
   * the new cursor position minus the initial one plus the scroll amount, so in our example:
   * 3. selectorPos.w = pointerPos.x (5) - initialPointerPos.x (0) + scrollAmount.x (10) === 15;
   *
   * let’s say after that movement we now scroll 20px to the left and move our cursor by 30px to the left:
   * 1b. pointerPos.x (-30) > initialPointerPos.x (0) - scrollAmount.x (-20) === -30 < --20 === -30 < +20 === false;
   * 2b. selectorPos.x = pointerPos.x (-30) === -30; move left position to cursor (for more info see Problem #1)
   * 3b. selectorPos.w = initialPointerPos.x (0) - pointerPos.x (-30) - scrollAmount.x (-20) === 0--30--20 === 0+30+20 === 50;  // scale width to original left position (for more info see Problem #1)
   *
   * same thing has to be done for top/bottom
   *
   * I hope that makes sense. Try stuff out and play around with variables to get a hang of it.
   */
  if (!containerSize) return
  const selectorPos: Partial<DSBoundingRect> = {}

  const relativeInitialPointerPos = {
    x: initialPointerPos.x - containerSize.left + scrollAmount.x,
    y: initialPointerPos.y - containerSize.top + scrollAmount.y,
  }

  const relativePointerPos = {
    x: pointerPos.x - containerSize.left + scrollAmount.x,
    y: pointerPos.y - containerSize.top + scrollAmount.y,
  }

  const clampedPointerPos = {
    x: Math.min(Math.max(relativePointerPos.x, 0), containerSize.width),
    y: Math.min(Math.max(relativePointerPos.y, 0), containerSize.height),
  }

  // right
  if (clampedPointerPos.x >= relativeInitialPointerPos.x) {
    // 1.
    selectorPos.left = Math.max(relativeInitialPointerPos.x, 0) // 2.
    selectorPos.width = clampedPointerPos.x - relativeInitialPointerPos.x // 3.
    // left
  } else {
    // 1b.
    selectorPos.left = Math.max(clampedPointerPos.x, 0) // 2b.
    selectorPos.width = relativeInitialPointerPos.x - clampedPointerPos.x
    // 3b.
  }

  // bottom
  if (clampedPointerPos.y >= relativeInitialPointerPos.y) {
    selectorPos.top = Math.max(relativeInitialPointerPos.y, 0)
    selectorPos.height = clampedPointerPos.y - relativeInitialPointerPos.y
    // top
  } else {
    selectorPos.top = Math.max(clampedPointerPos.y, 0)
    selectorPos.height = relativeInitialPointerPos.y - clampedPointerPos.y
  }

  return selectorPos
}

// if (!containerSize) return
//   const selectorPos: Partial<DSBoundingRect> = {}

//   const relativeInitialPointerPos = {
//     x: initialPointerPos.x - containerSize.left,
//     y: initialPointerPos.y - containerSize.top,
//   }

//   const relativePointerPos = {
//     x: pointerPos.x - containerSize.left,
//     y: pointerPos.y - containerSize.top,
//   }
//   // right
//   if (relativePointerPos.x > relativeInitialPointerPos.x - scrollAmount.x) {
//     // 1.
//     selectorPos.left = Math.max(relativeInitialPointerPos.x - scrollAmount.x, 0) // 2.
//     selectorPos.width = Math.min(
//       relativePointerPos.x - relativeInitialPointerPos.x + scrollAmount.x,
//       containerSize.width - selectorPos.left
//     ) // 3.
//     // left
//   } else {
//     // 1b.
//     selectorPos.left = Math.max(relativePointerPos.x, 0) // 2b.
//     selectorPos.width = Math.min(
//       relativeInitialPointerPos.x - relativePointerPos.x - scrollAmount.x,
//       containerSize.width - selectorPos.left
//     ) // 3b.
//   }

//   // bottom
//   if (relativePointerPos.y > relativeInitialPointerPos.y - scrollAmount.y) {
//     selectorPos.top = Math.max(relativeInitialPointerPos.y - scrollAmount.y, 0)
//     selectorPos.height = Math.min(
//       relativePointerPos.y - relativeInitialPointerPos.y + scrollAmount.y,
//       containerSize.height - selectorPos.top
//     )
//     // top
//   } else {
//     selectorPos.top = Math.max(relativePointerPos.y, 0)
//     selectorPos.height = Math.min(
//       relativeInitialPointerPos.y - relativePointerPos.y - scrollAmount.y,
//       containerSize.height - selectorPos.top
//     )
//   }

//   return selectorPos
