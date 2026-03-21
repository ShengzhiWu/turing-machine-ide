// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["rule-982"] = {};

examples["rule-982"]["name"] = {
    "zh": "规则 982",
    "en": "Rule 982"
};

examples["rule-982"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["rule-982"]["description"] = {
    "zh": "能发生周期性的变化并向右行进。路上遇到的1会稍微拖慢前进速度但不会破坏结构，最终被擦掉。",
    "en": "Can undergo periodic changes and move to the right. The 1s encountered along the way will slightly slow down the forward movement but will not destroy the structure, and will eventually be erased."
};


examples["rule-982"]["code"] = {};

examples["rule-982"]["code"]["zh"] = undefined;

examples["rule-982"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "", R

B, "", "1", L
B, "1", N, L, A`;

examples["rule-982"]["style"] = {};

examples["rule-982"]["style"]["zh"] = undefined;

examples["rule-982"]["style"]["en"] = `1, white, black`;

examples["rule-982"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["rule-982"]["recommended-max-steps"] = 500;  // 推荐的最大步数
