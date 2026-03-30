// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["huffman-code"] = {};

examples["huffman-code"]["name"] = {
    "zh": "霍夫曼编码",
    "en": "Huffman Code"
};

examples["huffman-code"]["category"] = {
    "zh": "其他/",
    "en": "Other/"
};

examples["huffman-code"]["description"] = {
    "zh": "霍夫曼编码是一种用于数据压缩的算法，它通过使用不同长度的编码来表示不同频率的符号，从而减少整体编码长度。理论上，当序列趋于无限长时，霍夫曼编码长度可以逼近序列的信息熵。",
    "en": "Huffman coding is an algorithm used for data compression. It uses variable-length codes to represent different symbols based on their frequencies, thereby reducing the overall length of the encoded data. Theoretically, as the sequence becomes infinitely long, the Huffman coding length can approach the information entropy of the sequence."
};


examples["huffman-code"]["code"] = {};

examples["huffman-code"]["code"]["zh"] = `// 霍夫曼编码
// 假设有以下编码表：
// 0:   A
// 10:  B
// 110: C
// 111: D

start, other, N, N, 0

0, "0", "A", R
0, "1", "", R, 1
0, "", N, N, end

1, "0", "B", R, 0
1, "1", "", R, 2
1, "", N, N, error

2, "0", "C", R, 0
2, "1", "D", R, 0
2, "", N, N, error`;

examples["huffman-code"]["code"]["en"] = `// Huffman Code
// Assume the following encoding table:
// 0:   A
// 10:  B
// 110: C
// 111: D
// 
start, other, N, N, 0

0, "0", "A", R
0, "1", "", R, 1
0, "", N, N, end

1, "0", "B", R, 0
1, "1", "", R, 2
1, "", N, N, error

2, "0", "C", R, 0
2, "1", "D", R, 0
2, "", N, N, error`;

examples["huffman-code"]["style"] = {};

examples["huffman-code"]["style"]["zh"] = undefined;

examples["huffman-code"]["style"]["en"] = `0, white, rgb(0,8,128)
1, white, rgb(206,135,196)`;

examples["huffman-code"]["tapes"] = [  // 样例初始纸带
    ["0", "0", "1", "1", "0", "1", "0", "0", "0", "1", "1", "1"]  // AACBAAD
];

examples["huffman-code"]["recommended-max-steps"] = 500;  // 推荐的最大步数
