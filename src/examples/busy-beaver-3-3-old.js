// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["busy-beaver-3-3-old"] = {};

examples["busy-beaver-3-3-old"]["name"] = {
    "zh": "忙碌的海狸 3,3（旧）",
    "en": "Busy beaver 3,3 (old)"
};

examples["busy-beaver-3-3-old"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["busy-beaver-3-3-old"]["description"] = {
    "zh": "能在空纸带上留下非常多1且会停机的3状态3符号图灵机，曾经的 BB(3,3) 冠军（已被击败）。在最初进入A状态运行92649163步后停机。",
    "en": "A 3-state 3-symbol Turing machine that leaves a lot of 1s on an empty tape and halts, the former champion of BB(3,3) (now beaten). It halts after 92,649,163 steps when first entering state A."
};


examples["busy-beaver-3-3-old"]["code"] = {};

examples["busy-beaver-3-3-old"]["code"]["zh"] = undefined;

examples["busy-beaver-3-3-old"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "1", R, end
A, "2", "2", L, C

B, "", "1", L, C
B, "1", "2", R, B
B, "2", "1", L, B

C, "", "1", L, A
C, "1", "", R, B
C, "2", "2", L, A`;

examples["busy-beaver-3-3-old"]["style"] = {};

examples["busy-beaver-3-3-old"]["style"]["zh"] = undefined;

examples["busy-beaver-3-3-old"]["style"]["en"] = `1, white, black
2, white, rgb(37,104,80)`;

examples["busy-beaver-3-3-old"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["busy-beaver-3-3-old"]["recommended-max-steps"] = 500;  // 推荐的最大步数
