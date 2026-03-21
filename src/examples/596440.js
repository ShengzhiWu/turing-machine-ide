// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["596440"] = {};

examples["596440"]["name"] = {
    "zh": "竞赛机 596440",
    "en": "The prize Turing machine 596440"
}

examples["596440"]["description"] = {
    "zh": "沃尔特弗雷姆竞赛机596440。它只有2个状态和3种记号，却是一台通用图灵机。这意味着只要在纸带上写下特定的内容，它能执行任何可计算的运算。或者更确切的说，只要把任何图灵机程序编码并写在纸带上，596440就能模拟那个程序的运行。\n596440即使运行在空纸带上也有复杂的行为，能自行产生具有自相似性的图案。",
    "en": "Wolfram Prize-winning Turing machine 596440. It has only 2 states and 3 symbols, yet it is a universal Turing machine, which means that as long as you write specific content on the tape, it can perform any computable operation. Or more precisely, as long as you encode any Turing machine program and write it on the tape, 596440 can simulate the execution of that program.\nEven when running on an empty tape, 596440 exhibits complex behavior and can generate self-similar patterns on its own."
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

examples["596440"]["style"]["zh"] = undefined;

examples["596440"]["style"]["en"] = `1, white, rgb(0,8,128)
2, white, rgb(206,135,196)`;

examples["596440"]["tapes"] = [  // 样例初始纸带
    [""]
];

examples["596440"]["recommended-max-steps"] = 500;  // 推荐的最大步数
