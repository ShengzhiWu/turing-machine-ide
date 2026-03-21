// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["busy-beaver-3"] = {};

examples["busy-beaver-3"]["name"] = {
    "zh": "忙碌的海狸 3",
    "en": "Busy beaver 3"
}

examples["busy-beaver-3"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["busy-beaver-3"]["description"] = {
    "zh": "已知的能在空纸带上留下最多1且会停机的3状态图灵机 BB(3)。",
    "en": "The known 3-state Turing machine BB(3) that leaves the maximum number of 1s on an empty tape and halts."
};


examples["busy-beaver-3"]["code"] = {};

examples["busy-beaver-3"]["code"]["zh"] = undefined;

examples["busy-beaver-3"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "1", L, C

B, "", "1", L, A
B, "1", "1", R, B

C, "", "1", L, B
C, "1", "1", R, end`;

examples["busy-beaver-3"]["style"] = {};

examples["busy-beaver-3"]["style"]["zh"] = undefined;

examples["busy-beaver-3"]["style"]["en"] = `1, white, black`;

examples["busy-beaver-3"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["busy-beaver-3"]["recommended-max-steps"] = 500;  // 推荐的最大步数
