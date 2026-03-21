// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["596440"] = {};

examples["596440"]["name"] = {
    "zh": "竞赛机 596440",
    "en": "The prize Turing machine 596440"
}

examples["596440"]["description"] = {
    "zh": "沃尔特弗雷姆竞赛机596440。",
    "en": "Wolfram Prize-winning Turing machine 596440."
};


examples["596440"]["code"] = {};

examples["596440"]["code"]["zh"] = `// 竞赛机 596440（2状态3色）

start, other, N, N, A

A, "", "1", R, B
A, "1", "2", L, A
A, "2", "1", L, A

B, "", "2", L, A
B, "1", "2", R, B
B, "2", "", R, A`;

examples["596440"]["code"]["en"] = `// The prize Turing machine 596440 (2 states, 3 colors)

start, other, N, N, A

A, "", "1", R, B
A, "1", "2", L, A
A, "2", "1", L, A

B, "", "2", L, A
B, "1", "2", R, B
B, "2", "", R, A`;

examples["596440"]["style"] = {};

examples["596440"]["style"]["zh"] = ``;

examples["596440"]["style"]["en"] = `1, white, rgb(0,8,128)
2, white, rgb(206,135,196)`;

examples["596440"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["596440"]["recommended-max-steps"] = 500;  // 推荐的最大步数
