// Standard DES-ECB decryptor for JioSaavn encrypted_media_url (key: "38346591")

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
];

const FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25,
];

const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
  10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
  14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];

const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
  23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
  41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
  44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
];

const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
  8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
  24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
];

const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
  2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
];

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

const SBOX = [
  [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11],
];

function permute(bits: number[], table: number[]): number[] {
  return table.map(pos => bits[pos - 1]);
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i * 8 + j];
    bytes[i] = val;
  }
  return bytes;
}

function generateSubkeys(keyStr: string): number[][] {
  const keyBytes = new TextEncoder().encode(keyStr);
  const key56 = permute(bytesToBits(keyBytes), PC1);
  let left = key56.slice(0, 28);
  let right = key56.slice(28, 56);
  const subkeys: number[][] = [];
  for (const shift of SHIFTS) {
    left = [...left.slice(shift), ...left.slice(0, shift)];
    right = [...right.slice(shift), ...right.slice(0, shift)];
    subkeys.push(permute([...left, ...right], PC2));
  }
  return subkeys;
}

function feistel(right: number[], subkey: number[]): number[] {
  const expanded = permute(right, E);
  const xored = expanded.map((b, i) => b ^ subkey[i]);
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    const chunk = xored.slice(i * 6, i * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    const val = SBOX[i][row * 16 + col];
    for (let b = 3; b >= 0; b--) out.push((val >> b) & 1);
  }
  return permute(out, P);
}

const SUBKEYS = generateSubkeys('38346591');

export function decryptMediaUrl(encryptedUrl: string): string {
  if (!encryptedUrl) return '';
  const bin = atob(encryptedUrl);
  const input = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) input[i] = bin.charCodeAt(i);

  const output = new Uint8Array(input.length);
  for (let offset = 0; offset < input.length; offset += 8) {
    const block = input.slice(offset, offset + 8);
    const permuted = permute(bytesToBits(block), IP);
    let left = permuted.slice(0, 32);
    let right = permuted.slice(32, 64);

    // Decryption uses subkeys in reverse order
    for (let r = 15; r >= 0; r--) {
      const f = feistel(right, SUBKEYS[r]);
      const nextRight = left.map((b, i) => b ^ f[i]);
      left = right;
      right = nextRight;
    }

    const plainBits = permute([...right, ...left], FP);
    output.set(bitsToBytes(plainBits), offset);
  }

  // Strip PKCS5/PKCS7 padding
  const pad = output[output.length - 1];
  const unpadded = pad > 0 && pad <= 8 ? output.slice(0, output.length - pad) : output;
  return new TextDecoder().decode(unpadded);
}

export function buildDownloadUrls(encryptedUrl: string, has320kbps?: boolean | string): { quality: string; link: string }[] {
  const base = decryptMediaUrl(encryptedUrl);
  if (!base) return [];
  const urls = [
    { quality: '96kbps', link: base.replace(/_\d+\.mp4/, '_96.mp4') },
    { quality: '160kbps', link: base.replace(/_\d+\.mp4/, '_160.mp4') },
  ];
  if (has320kbps === true || has320kbps === 'true') {
    urls.push({ quality: '320kbps', link: base.replace(/_\d+\.mp4/, '_320.mp4') });
  }
  return urls;
}

