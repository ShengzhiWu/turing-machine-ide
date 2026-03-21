// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["busy-beaver-5"] = {};

examples["busy-beaver-5"]["name"] = {
    "zh": "忙碌的海狸 5",
    "en": "Busy beaver 5"
};

examples["busy-beaver-5"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["busy-beaver-5"]["description"] = {
    "zh": "已知的能在空纸带上留下最多1且会停机的5状态图灵机 BB(5)。它一开始进入状态A后需要运行47176870步才停机，留下4098个1。",
    "en": "The known 5-state Turing machine BB(5) that leaves the maximum number of 1s on an empty tape and halts. It takes 47,176,870 steps to halt after entering state A, leaving 4,098 1s on the tape."
};


examples["busy-beaver-5"]["code"] = {};

examples["busy-beaver-5"]["code"]["zh"] = undefined;

examples["busy-beaver-5"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "1", L, C

B, "", "1", R, C
B, "1", "1", R, B

C, "", "1", R, D
C, "1", "", L, E

D, "", "1", L, A
D, "1", "1", L, D

E, "", "1", R, end
E, "1", "", L, A`;

examples["busy-beaver-5"]["style"] = {};

examples["busy-beaver-5"]["style"]["zh"] = undefined;

examples["busy-beaver-5"]["style"]["en"] = `1, white, black`;

examples["busy-beaver-5"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["busy-beaver-5"]["recommended-max-steps"] = 500;  // 推荐的最大步数
