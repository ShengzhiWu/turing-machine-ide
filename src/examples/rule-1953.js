// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["rule-1953"] = {};

examples["rule-1953"]["name"] = {
    "zh": "规则 1953",
    "en": "Rule 1953"
}

examples["rule-1953"]["description"] = {
    "zh": "能产生复杂的图案并向右无限扩张。",
    "en": "Can generate complex patterns and expand infinitely to the right."
};


examples["rule-1953"]["code"] = {};

examples["rule-1953"]["code"]["zh"] = undefined;

examples["rule-1953"]["code"]["en"] = `start, other, N, N, A

A, "", "1", L, B
A, "1", N, R

B, "", N, R, A
B, "1", "", L`;

examples["rule-1953"]["style"] = {};

examples["rule-1953"]["style"]["zh"] = undefined;

examples["rule-1953"]["style"]["en"] = `1, white, black`;

examples["rule-1953"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["rule-1953"]["recommended-max-steps"] = 500;  // 推荐的最大步数
