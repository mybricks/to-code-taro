import UploadOssHelper from '../tools/oss'

export type DataType = {
  mode?: 'custom' | 'quick';
  platform?: 'oss';
  custom?: {
    url: string;
    name: string;
  };
  oss?: {
    accessKeyId: string;
    accessKeySecret: string;
    host: string;
  };
};

export interface Inputs {
  upload?: (fn: (config: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

export default function ({ env, data, inputs, outputs }: { env: any; data: DataType; inputs: Inputs; outputs: Outputs }) {
  if (!env.runtime) {
    return;
  }

  inputs["upload"]?.((value: any) => {
    /** 自定义上传 */
    if (data.mode === "custom") {
      let params: any = {
        withCredentials: false,
        url: data.custom!.url,
        filePath: value.filePath,
        name: data.custom!.name,
        formData: {
          ...(value.formData || {}),
        },
      };

      if (typeof value.fileName === "string") {
        params.fileName = value.fileName;
      }

      env.uploadFile({
        ...params,
        success(res: any) {
          let resData = res.data;
          if (resData) {
            try {
              resData = JSON.parse(resData);
            } catch (err) {}
          }
          outputs["onSuccess"](resData);
        },
        fail(err: any) {
          outputs["onFail"](err);
        },
      });
      return;
    }

    /** 阿里云 OSS 上传 */
    if (data.mode === "quick" && data.platform === "oss") {
      const ossHelper = new UploadOssHelper({
        accessKeyId: data.oss!.accessKeyId,
        accessKeySecret: data.oss!.accessKeySecret,
      });

      const ossParams = ossHelper.createUploadParams();

      env.uploadFile({
        withCredentials: false,
        url: data.oss!.host,
        filePath: value.filePath,
        name: "file",
        formData: {
          ...(value.formData || {}),
          policy: ossParams.policy,
          OSSAccessKeyId: ossParams.OSSAccessKeyId,
          signature: ossParams.signature,
        },
        success(res: any) {
          if (res.statusCode === 204) {
            outputs["onSuccess"](`${data.oss!.host}/${value.formData.key}`);
          } else {
            outputs["onFail"](res);
          }
        },
        fail(err: any) {
          outputs["onFail"](err);
        },
      });
      return;
    }
  });
};
