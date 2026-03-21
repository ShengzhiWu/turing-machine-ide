// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["rule-2506"] = {};

examples["rule-2506"]["name"] = {
    "zh": "规则 2506",
    "en": "Rule 2506"
};

examples["rule-2506"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["rule-2506"]["description"] = {
    "zh": "能产生交替的图案且向两侧无限扩散。",
    "en": "Can generate alternating patterns and spread infinitely in both directions."
};


examples["rule-2506"]["code"] = {};

examples["rule-2506"]["code"]["zh"] = undefined;

examples["rule-2506"]["code"]["en"] = `start, other, N, N, A

A, "", "1", R, B
A, "1", "", L, B

B, "", "1", L, A
B, "1", "", R, A`;

examples["rule-2506"]["style"] = {};

examples["rule-2506"]["style"]["zh"] = undefined;

examples["rule-2506"]["style"]["en"] = `1, white, black`;

examples["rule-2506"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["rule-2506"]["recommended-max-steps"] = 500;  // 推荐的最大步数
