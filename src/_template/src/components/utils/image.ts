import Taro from "@tarojs/taro";
import { isNumber, isString } from './core'

const pixelRatio = Taro.getSystemInfoSync().pixelRatio;

// const getWidth = (w: number) => Math.round(w / 200) * 200;
const dpr = pixelRatio ?? window?.devicePixelRatio;
// const commonWidth = getWidth((window.screen.availWidth || document.body.clientWidth) * dpr);

// const isSupportWebp = (() => {
//   try {
//     return document.createElement('canvas').toDataURL('image/webp', 0.5).indexOf('data:image/webp') === 0;
//   } catch(err) {
//     return false;
//   }
// })()

// export function imageWebpProcess(url: string) {
//   return isSupportWebp ? url : ''
// }

// /**
//  * 给各个云存储的图片增加处理参数
//  */
// export function imageProcess(url: string, width: number) {
//   width = (width * dpr) | 0;
//   switch (true) {
//     case /https?:\/\/js/.test(url):
//       return imageProcessJs(url, width);
//     case /https?:\/\/ali/.test(url):
//       return imageProcessAli(url, width);
//     case /https?:\/\/tx/.test(url):
//       return imageProcessTx(url, width);
//     case /https?:\/\/p[0-9]\./.test(url): // 其他cdn，按cdn方的人来说是动态的，都支持阿里的参数
//       return imageProcessAli(url, width);
//     default:
//       return url;
//   }
// }

// /**
//  * 金山云 https://docs.ksyun.com/documents/886
//  * @param url
//  * @param width
//  */
// function imageProcessJs(url: string, width: number) {
//   width = width || commonWidth;
//   const pos = url.indexOf('@');
//   const base = url.slice(0, pos === -1 ? +Infinity : pos);

//   return base + '@base@tag=imgScale&m=1&w=' + width + '&q=85&interlace=1';
// }

// /**
//  * 阿里云 https://help.aliyun.com/document_detail/44687.html
//  * @param url
//  * @param width
//  */
// function imageProcessAli(url: string, width: number) {
//   width = width || commonWidth;
//   const pos = url.indexOf('?');
//   const base = url.slice(0, pos === -1 ? +Infinity : pos);

//   return base + '?x-oss-process=image/resize,w_' + width + '/format,jpg/interlace,1/quality,q_85';
// }

// /**
//  * 腾讯云 https://cloud.tencent.com/document/product/460/36540
//  * @param url
//  * @param width
//  */
// function imageProcessTx(url: string, width: number) {
//   width = width || commonWidth;
//   const pos = url.indexOf('?');
//   const base = url.slice(0, pos === -1 ? +Infinity : pos);

//   return base + '?imageView2/2/w/' + width + '/format/jpg/interlace/1/q/85';
// }

export enum IMAGE_MODE {
  ASPECTFILL = "aspectFill",
  OBJECTFIT = "objectFit",
  TOP = "top",
  LEFT = "left",
  RIGHT = "right",
  BOTTOM = "bottom",
  ASPECTFIT = "aspectFit",
  SCALETOFILL = "scaleToFill",
  WIDTHFIX = "widthFix",
  HEIGHTFIX = 'heightFix'
}

interface CdnCutOptions {
  quality?: number
}


interface CdnCutMeta {
  url: string
  width?: number | string
  height?: number | string
}

/**
 * 从字符串中提取数字（支持 px、rpx 等单位）
 * @param value 可能是数字或字符串（如 "375px", "400rpx", "100%"）
 * @returns 提取的数字，如果无法提取则返回 null
 */
function parseNumericValue(value: number | string | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  
  // 如果是数字，直接返回
  if (isNumber(value)) {
    return value;
  }
  
  // 如果是字符串，尝试提取数字
  if (isString(value)) {
    // 排除百分比
    if (value.includes('%')) {
      return null;
    }
    
    // 提取数字部分（支持 px、rpx 等单位）
    const match = value.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      return Number.isNaN(num) ? null : num;
    }
  }
  
  return null;
}

export function autoCdnCut ({
  url,
  width,
  height,
}: CdnCutMeta, options: CdnCutOptions) {
  const { quality = 85 } = options ?? {};
  if (!isString(url) || !url) {
    return url;
  }

  if (url.indexOf('https') === -1 || url.indexOf('assets.mybricks.world') === -1) {
    return url
  }
  let query = '?x-oss-process=image/resize,';

  // 解析 width 和 height（支持数字和字符串格式）
  const parsedWidth = parseNumericValue(width);
  const parsedHeight = parseNumericValue(height);

  if (parsedWidth !== null) {
    query+= `w_${(parsedWidth * dpr).toFixed(0)}`
  } else if (parsedHeight !== null) {
    query+= `h_${(parsedHeight * dpr).toFixed(0)}`
  }

  if (isNumber(quality)) {
    query+= `/quality,q_${quality}`
  }

  return `${url}${query}`
}