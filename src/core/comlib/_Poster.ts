import Taro from '@tarojs/taro'

export type DataType = {
  canvasWidth: number
  canvasHeight: number
}

export type ElementType = {
  // 绘制类型，支持的值：text, image, shape
  type: string
  // 绘制的左上角 X 坐标值
  x: number
  // 绘制的左上角 Y 坐标值
  y: number
  // 绘制的宽度。（如果是文本类型，宽度达到width 会自动换行）
  width: number
  // 绘制的高度。（如果是文本类型，超过高度会显示省略号）
  height: number
  // 文字颜色（仅文本类型时生效）
  color: string
  // 文字字号（仅文本类型时生效）
  fontSize: number
  // 文字粗细，（仅文本类型时生效）
  fontWeight: string
  // 行高（仅文本类型时生效）
  lineHeight: number
  // 文字对齐方式，支持的值：left, right, center（仅文本类型时生效）
  textAlign: string
  //  绘制的内容（文本类型时为文本内容，图片类型时为图片 URL 地址）
  content: string
  // 角大小（仅图片，形状类型时生效）
  borderRadius: number
  // 边框宽度（仅图片，形状类型时生效）
  borderWidth: number
  // 边框颜色（仅图片，形状类型时生效）
  borderColor: string
  // 颜色（仅形状类型时生效）
  backgroundColor: string
  //
  imageObj?: string
}

export type ValType = ElementType[]

export interface Inputs {
  call?: (fn: (val: ValType) => void) => void
}

export interface Outputs {
  success: (value?: any) => void
  fail: (value?: any) => void
}

interface IOContext {
  data: DataType
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const data: DataType = context.data
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.call?.(async (val) => {
    try {
      let elements = val

      // 创建离屏 2D canvas 实例
      let canvas = Taro.createOffscreenCanvas({
        type: '2d',
        width: data.canvasWidth,
        height: data.canvasHeight,
      })

      // 获取 context
      const context = canvas.getContext('2d')

      // 预加载所有图片
      for (let i = 0; i < elements.length; i++) {
        let element = elements[i]
        if (element.type === 'image') {
          const image = canvas.createImage()
          await new Promise((resolve) => {
            image.onload = resolve
            image.src = element.content
          })
          elements[i].imageObj = image
        }
      }

      // 把元素画到离屏 canvas 上
      for (let i = 0; i < elements.length; i++) {
        let element = elements[i]

        switch (element.type) {
          case 'text':
            await drawText(context, element)
            break
          case 'image':
            await drawImage(context, element)
            break
          case 'shape':
            await drawShape(context, element)
            break
          default:
            break
        }
      }

      // 获取离屏 canvas 的内容
      const base64 = context.canvas.toDataURL('image/png')
      outputs['success'](base64)

      /**
       * 绘制形状
       *
       * x: 0
       * y: 0
       * width: 375
       * height: 30
       * borderRadius: 50
       * borderWidth: 2
       * borderColor: "#000000"
       * backgroundColor: "#000000"
       *
       */
      async function drawShape(context: any, element: ElementType) {
        const {
          x = 0,
          y = 0,
          width,
          height,
          borderRadius = 0,
          borderWidth = 0,
          borderColor,
          backgroundColor,
        } = element

        // 调整绘制路径的位置，确保边框不会超出 width 和 height 的范围
        const halfBorderWidth = borderWidth / 2
        const adjustedX = x + halfBorderWidth
        const adjustedY = y + halfBorderWidth
        const adjustedWidth = width - borderWidth
        const adjustedHeight = height - borderWidth

        // 限制 borderRadius 的最大值
        const maxBorderRadius = Math.min(adjustedWidth, adjustedHeight) / 2
        const effectiveBorderRadius = Math.min(borderRadius, maxBorderRadius)

        // 绘制圆角矩形边框
        context.save()
        context.beginPath()
        context.moveTo(adjustedX + effectiveBorderRadius, adjustedY)
        context.arcTo(
          adjustedX + adjustedWidth,
          adjustedY,
          adjustedX + adjustedWidth,
          adjustedY + adjustedHeight,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX + adjustedWidth,
          adjustedY + adjustedHeight,
          adjustedX,
          adjustedY + adjustedHeight,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX,
          adjustedY + adjustedHeight,
          adjustedX,
          adjustedY,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX,
          adjustedY,
          adjustedX + adjustedWidth,
          adjustedY,
          effectiveBorderRadius,
        )
        context.closePath()

        // 设置边框样式
        context.lineWidth = borderWidth
        context.strokeStyle = borderColor
        context.stroke()

        // 设置背景颜色
        context.fillStyle = backgroundColor
        context.fill()

        // 恢复裁剪区域
        context.restore()
      }

      /**
       * 绘制图片
       *
       * x: 0
       * y: 30
       * width: 375
       * height: 30
       * borderRadius: 50
       * borderWidth: 2
       * borderColor: "#000000"
       * imageObj: Image
       *
       */
      async function drawImage(context: any, element: ElementType) {
        const {
          x = 0,
          y = 0,
          width,
          height,
          borderRadius = 0,
          borderWidth = 0,
          borderColor,
          imageObj,
        } = element

        // 调整绘制路径的位置，确保边框不会超出 width 和 height 的范围
        const halfBorderWidth = borderWidth / 2
        const adjustedX = x + halfBorderWidth
        const adjustedY = y + halfBorderWidth
        const adjustedWidth = width - borderWidth
        const adjustedHeight = height - borderWidth

        // 限制 borderRadius 的最大值
        const maxBorderRadius = Math.min(adjustedWidth, adjustedHeight) / 2
        const effectiveBorderRadius = Math.min(borderRadius, maxBorderRadius)

        // 绘制圆角矩形边框
        context.save()
        context.beginPath()
        context.moveTo(adjustedX + effectiveBorderRadius, adjustedY)
        context.arcTo(
          adjustedX + adjustedWidth,
          adjustedY,
          adjustedX + adjustedWidth,
          adjustedY + adjustedHeight,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX + adjustedWidth,
          adjustedY + adjustedHeight,
          adjustedX,
          adjustedY + adjustedHeight,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX,
          adjustedY + adjustedHeight,
          adjustedX,
          adjustedY,
          effectiveBorderRadius,
        )
        context.arcTo(
          adjustedX,
          adjustedY,
          adjustedX + adjustedWidth,
          adjustedY,
          effectiveBorderRadius,
        )
        context.closePath()

        // 设置边框样式
        if (borderWidth > 0) {
          context.lineWidth = borderWidth
          context.strokeStyle = borderColor
          context.stroke()
        }

        // 裁剪到圆角矩形区域
        context.clip()

        // 绘制图片
        context.drawImage(
          imageObj,
          adjustedX,
          adjustedY,
          adjustedWidth,
          adjustedHeight,
        )

        // 恢复裁剪区域
        context.restore()
      }

      /**
       * 绘制文本
       *
       * x: 0
       * y: 30
       * width: 375
       * height: 30
       * color: #000000
       * fontSize: 30
       * fontWeight: normal | bold
       * lineHeight: 30
       * textAlign: center | left | right
       * content: "Hello World"
       *
       */
      async function drawText(context: any, element: ElementType) {
        let {
          x = 0,
          y = 0,
          width = 999999999,
          height = 999999999,
          color = '#000000',
          fontSize = 12,
          fontWeight = 'normal',
          lineHeight,
          textAlign = 'left',
          content = '',
        } = element

        // 设置字体
        context.font = `${fontWeight} ${fontSize}px system-ui`
        context.fillStyle = color
        context.textBaseline = 'bottom'

        // 计算行高
        lineHeight = lineHeight || fontSize

        // 文本最大行数
        const maxLines = Math.floor(height / lineHeight) // 向下取整

        // 文本的行数
        const lines = [] as string[]
        let line = ''

        // 拆分文本
        for (let i = 0; i < content.length; i++) {
          let char = content[i]

          if (context.measureText(line + char).width > width) {
            lines.push(line)
            line = char
          } else {
            line += char
          }
        }
        lines.push(line)

        // 绘制文本
        for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
          let line = lines[i]
          let textX = x

          // 如果是最后一行，且超过了 width，就显示省略号
          if (i === maxLines - 1 && i < lines.length - 1) {
            while (context.measureText(line + '...').width > width) {
              line = line.slice(0, -1)
            }
            line += '...'
          }

          switch (textAlign) {
            case 'left':
              textX = x
              break
            case 'center':
              textX = x + (width - context.measureText(line).width) / 2
              break
            case 'right':
              textX = x + width - context.measureText(line).width
              break
            default:
              break
          }

          context.fillText(line, textX, y + lineHeight * (i + 1))
        }
      }
    } catch (error: any) {
      console.error('图片绘制失败:', error)
      outputs.fail({
        errMsg: error?.message || '图片绘制失败',
      })
    }
  })
}
