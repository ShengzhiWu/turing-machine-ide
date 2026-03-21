// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["busy-beaver-4"] = {};

examples["busy-beaver-4"]["name"] = {
    "zh": "忙碌的海狸 4",
    "en": "Busy beaver 4"
}

examples["busy-beaver-4"]["description"] = {
    "zh": "已知的能在空纸带上留下最多1且会停机的4状态图灵机 BB(4)。",
    "en": "The known 4-state Turing machine BB(4) that leaves the maximum number of 1s on an empty tape and halts."
};


examples["busy-beaver-4"]["code"] = {};

examples["busy-beaver-4"]["code"]["zh"] = undefined;

examples["busy-beaver-4"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "1", L, B

B, "", "1", L, A
B, "1", "", L, C

C, "", "1", R, end
C, "1", "1", L, D

D, "", "1", R, D
D, "1", "", R, A`;

examples["busy-beaver-4"]["style"] = {};

examples["busy-beaver-4"]["style"]["zh"] = undefined;

examples["busy-beaver-4"]["style"]["en"] = `1, white, black`;

examples["busy-beaver-4"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["busy-beaver-4"]["recommended-max-steps"] = 500;  // 推荐的最大步数
