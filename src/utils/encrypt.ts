/**
 * 飞书事件 body 解密（AES）
 * 文档: https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/encrypt-key-encryption-configuration-case
 */
import * as crypto from "crypto";

const BLOCK_SIZE = 32;

function decodeBase64(str: string): Buffer {
  return Buffer.from(str, "base64");
}

export function decrypt(encrypt: string, key: string): string {
  const keyBytes = Buffer.from(key, "utf8");
  const keyHash = crypto.createHash("sha256").update(keyBytes).digest();

  const data = decodeBase64(encrypt);
  const iv = data.subarray(0, 16);
  const cipher = data.subarray(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", keyHash, iv);
  let dec = decipher.update(cipher);
  dec = Buffer.concat([dec, decipher.final()]);

  // 去除 padding
  let pad = dec[dec.length - 1];
  if (pad < 1 || pad > BLOCK_SIZE) pad = 0;
  dec = dec.subarray(0, dec.length - pad);
  return dec.toString("utf8");
}
