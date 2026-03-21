// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["busy-beaver-3-3"] = {};

examples["busy-beaver-3-3"]["name"] = {
    "zh": "忙碌的海狸 3,3",
    "en": "Busy beaver 3,3"
};

examples["busy-beaver-3-3"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["busy-beaver-3-3"]["description"] = {
    "zh": "已知的能在空纸带上留下最多1且会停机的3状态3符号图灵机 BB(3,3)。在最初进入A状态运行大约1.19×10¹⁷步后停机。",
    "en": "The known 3-state 3-symbol Turing machine BB(3,3) that leaves the most 1s on an empty tape and halts. It halts after approximately 1.19×10¹⁷ steps when first entering state A."
};


examples["busy-beaver-3-3"]["code"] = {};

examples["busy-beaver-3-3"]["code"]["zh"] = undefined;

examples["busy-beaver-3-3"]["code"]["en"] = `start, other, N, N, A

A, "", "", R, B
A, "1", "2", L, A
A, "2", "1", R, A

B, "", "1", L, A
B, "1", "2", R, B
B, "2", "1", R, C

C, "", "1", R, end
C, "1", "1", L, B
C, "2", "1", L, C`;

examples["busy-beaver-3-3"]["style"] = {};

examples["busy-beaver-3-3"]["style"]["zh"] = undefined;

examples["busy-beaver-3-3"]["style"]["en"] = `1, white, black
2, white, rgb(37,104,80)`;

examples["busy-beaver-3-3"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["busy-beaver-3-3"]["recommended-max-steps"] = 500;  // 推荐的最大步数
