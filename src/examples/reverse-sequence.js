// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["reverse-sequence"] = {};

examples["reverse-sequence"]["name"] = {
    "zh": "逆转序列",
    "en": "Reverse sequence"
}

examples["reverse-sequence"]["description"] = {
    "zh": "原位逆转一个二进制序列。",
    "en": "Reverse a binary sequence in place."
};

examples["reverse-sequence"]["code"] = {};

examples["reverse-sequence"]["code"]["zh"] = `// 逆转序列

start, other, N, R, 0

0, "0", "", R, 1
0, "1", "", R, 2
0, "0'", N, L, 7  // 运算已经完成，接下来擦除标记
0, "1'", N, L, 7  // 运算已经完成，接下来擦除标记
0, other, N, R

// 携带0去右边
1, "", N, L, 3
1, "0'", N, L, 3
1, "1'", N, L, 3
1, other, N, R

// 携带1去右边
2, "", N, L, 4
2, "0'", N, L, 4
2, "1'", N, L, 4
2, other, N, R

// 放下0
3, "0", "0'", L, 5
3, "1", "0'", L, 6
3, "", "0'", L, 7  // 运算已经完成，接下来擦除标记

// 放下1
4, "0", "1'", L, 5
4, "1", "1'", L, 6
4, "", "1'", L, 7  // 运算已经完成，接下来擦除标记

// 携带0去左边
5, "", "0'", R, 0
5, other, N, L

// 携带1去左边
6, "", "1'", R, 0
6, other, N, L

// 到最左边
7, "", N, R, 8
7, other, N, L

// 擦除标记
8, "0'", "0", R
8, "1'", "1", R
8, "", N, N, end`;

examples["reverse-sequence"]["code"]["en"] = `// Reverse sequence

start, other, N, R, 0

0, "0", "", R, 1
0, "1", "", R, 2
0, "0'", N, L, 7  // The sequence has been reversed. Now we need to erase the marks.
0, "1'", N, L, 7  // The sequence has been reversed. Now we need to erase the marks.
0, other, N, R

// Carry 0 to the right
1, "", N, L, 3
1, "0'", N, L, 3
1, "1'", N, L, 3
1, other, N, R

// Carry 1 to the right
2, "", N, L, 4
2, "0'", N, L, 4
2, "1'", N, L, 4
2, other, N, R

// Put down 0
3, "0", "0'", L, 5
3, "1", "0'", L, 6
3, "", "0'", L, 7  // The sequence has been reversed. Now we need to erase the marks.

// Put down 1
4, "0", "1'", L, 5
4, "1", "1'", L, 6
4, "", "1'", L, 7  // The sequence has been reversed. Now we need to erase the marks.

// Carry 0 to the left
5, "", "0'", R, 0
5, other, N, L

// Carry 1 to the left
6, "", "1'", R, 0
6, other, N, L

// Move to the leftmost position
7, "", N, R, 8
7, other, N, L

// Erase the marks
8, "0'", "0", R
8, "1'", "1", R
8, "", N, N, end`;

examples["reverse-sequence"]["style"] = {};

examples["reverse-sequence"]["style"]["zh"] = `0, white, rgb(55,78,142)
0', white, rgb(32,48,96)  // 已完成的位
1, white, rgb(141,55,142)
1', white, rgb(88,34,89)  // 已完成的位`;

examples["reverse-sequence"]["style"]["en"] = `0, white, rgb(55,78,142)
0', white, rgb(32,48,96)  // Finished bit
1, white, rgb(141,55,142)
1', white, rgb(88,34,89)  // Finished bit`;

examples["reverse-sequence"]["tapes"] = [  // 样例初始纸带
    ["", "1", "1", "1", "0", "1", "0", "0", "1", "0", "0", ""],  // 长度为偶数
    ["", "1", "1", "1", "0", "1", "0", "0", "1", "0", ""],  // 长度为奇数
    ["", "0", ""],  // 长度为1
    ["", "1", ""]  // 长度为1
];
