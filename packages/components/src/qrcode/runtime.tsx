import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Image } from "@tarojs/components";
import QRCode from "qrcode-generator";
import { isString } from "./../utils/core";
import css from "./style.less";

export default function ({ env, data, inputs, outputs, title, style }) {
  const [qrCode, setQrCode] = useState("");
  useMemo(() => {
    inputs["setValue"]?.((val) => {
      if (isString(val)) {
        data.text = val;
      }
    });
  }, []);

  useEffect(() => {
    if (data.text) {
      const qr = QRCode(0, "L");
      const utf8Text = unescape(encodeURIComponent(data.text));
      qr.addData(utf8Text, "Byte");
      qr.make();
      const url = qr.createDataURL(10, 0);
      setQrCode(url);
    } else {
      setQrCode("");
    }
  }, [data.text]);

  return (
    <View className={css.code}>
      {data.mode === "qrcode" && qrCode && (
        <Image
          mode="widthFix"
          style={{ display: "block", width: "100%", height: "100%" }}
          src={qrCode}
        ></Image>
      )}
    </View>
  );
}
