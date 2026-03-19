// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["binary-division"] = {};

examples["binary-division"]["name"] = {
    "zh": "二进制除法",
    "en": "Binary division"
}
;
examples["binary-division"]["description"] = {
    "zh": "这个图灵机实现了二进制除法。约定初始纸带格式：空格，被除数，空格，除数。被除数和除数首位必须为1。",
    "en": "This Turing machine implements binary division. The initial tape format is as follows: blank, dividend, blank, divisor. The first digit of both the dividend and divisor must be 1."
};

examples["binary-division"]["code"] = {};

examples["binary-division"]["code"]["zh"] = `// 二进制除法

start, "", "P", R, 2  // 添加被除数左侧记号
start, other, N, R

2, "", N, R, 3
2, other, N, R

3, "0", N, R, 4
3, "1", N, R, 4
3, other, N, R

4, "", "Q", R, 40  // 添加除数右侧记号
4, other, N, R

40, "", "A", L, 5  // 填一个商占位符
40, other, N, N, error

5, "P", N, R, 6
5, other, N, L

6, "0", "0'", R, 7  // 发现0，接下来移动到被除数区加上一个商占位符
6, "1", "1'", R, 7  // 发现1，接下来移动到被除数区加上一个商占位符
6, "", N, R, 41  // 发现空格，这说明已经在商区填上了与被除数一样长的商占位符，接下来去除掉和除数一样长的商占位符
6, other, N, R

// 向右走到商的区域
7, "Q", N, R, 8
7, other, N, R

// 向右走到空白处添加商占位记号
8, "", "A", L, 5  // 添加商占位记号
8, other, N, R

41, "0", "0'", R, 42
41, "1", "1'", R, 42
41, "A", N, R, 10  // 已经去除掉和除数位数一样多的商占位符，接下来开始将被除数转移到余数区
41, "", N, N, 45  // 被除数的位数小于除数，商为0，余数为被除数
41, other, N, R

42, "", N, L, 43
42, other, N, R

43, "A", "", L, 44
43, "Q", N, R, 45  // 被除数的位数小于除数，商为0，余数为被除数

45, "", "0", R, 46
45, other, N, N, error

46, "", "R", L, 47
46, other, N, N, error

47, "P", N, R, 48
47, other, N, L

48, "0'", "0", R, 49  // 在被除数区发现0，接下来将它转移到余数区
48, "1'", "1", R, 50  // 在被除数区发现1，接下来将它转移到余数区
48, "", N, L, 53  // 被除数已经完全转移到余数区，计算结束
48, other, N, R

49, "R", N, R, 51
49, other, N, R

50, "R", N, R, 52
50, other, N, R

51, "", "0", L, 47
51, other, N, R

52, "", "1", L, 47
52, other, N, R

53, "P", "", R, 54
53, other, N, L

54, "0'", "0", R  // 擦掉特殊记号
54, "1'", "1", R  // 擦掉特殊记号
54, "Q", "", R  // 擦掉特殊记号
54, "R", "", N, end  // 已经擦掉了所有特殊记号，程序结束
54, other, N, R

44, "", N, R, 41
44, other, N, L

10, "", "R", L, 11  // 添加商右侧记号
10, other, N, R

// 向左走到P
11, "", N, L, 55
11, "0'", "0", L
11, "1'", "1", L
11, other, N, L

55, "P", N, R, 12
55, other, N, L

12, "", N, R, 17  // 发现空格，这说明被除数已经完整地转移到了余数区，接下来开始计算商的最高位
12, "0'", "0", R, 13  // 发现0，接下来去余数区填一个0
12, "1'", "1", R, 14  // 发现1，接下来去余数区填一个1
12, other, N, R  // 继续寻找

13, "R", N, R, 15
13, other, N, R

14, "R", N, R, 16
14, other, N, R

15, "", "0", L, 11  // 在余数区填0
15, other, N, R

16, "", "1", L, 11  // 在余数区填1
16, other, N, R

// 检查商还有没有未确定的位
56, "A", N, R, 64  // 检测到了未确定的位
56, "R", N, R, 65  // 商没有待确定的位，计算已经完成
56, other, N, R

// 移到最右边
65, "", N, L, 39
65, other, N, R

// 检查余数区高位有没有1，如果有的话，去商区填一个1
64, "1'", N, L, 57
64, "", N, L, 58  // 余数区高位没有1，接下来进行常规比较
64, other, N, R

57, "Q", N, R, 28  // 接下来在商区填一个1
57, other, N, L

58, "", N, R, 17
58, other, N, L

// 比较除数和余数区中待比较部分的大小
17, "0", "0'", R, 18  // 拿到了0，接下来去余数区比较
17, "1", "1'", R, 19  // 拿到了1，接下来去余数区比较
17, "Q", N, R, 60  // 遇到了Q，这说明比较已经完成，除数不大于余数区的待比较部分，接下来把余数区用于比较的记号擦掉，然后在商区填一个1
17, other, N, R

18, "R", N, R, 20
18, other, N, R

19, "R", N, R, 21
19, other, N, R

20, "0", "0~", L, 22  // 接下来比较下一位
20, "1", "1~", L, 22  // 接下来比较下一位
20, "", N, L, 39  // 除数位数超过余数未固定位数，计算完成，接下来把多余的记号擦掉
20, other, N, R

21, "0", N, L, 23  // 除数大于等于余数中正在参与比较的部分，接下来给商中填一个0
21, "1", "1~", L, 22  // 接下来比较下一位
21, "", N, L, 39  // 除数位数超过余数未固定位数，计算完成，接下来把多余的记号擦掉
21, other, N, R

22, "", N, R, 17
22, other, N, L

23, "0~", "0", L
23, "1~", "1", L
23, "R", N, R, 24
23, other, N, L

24, "0", "0'", L, 25  // 标记这一位余数之后不再参与比较
24, "1", "1'", L, 25  // 标记这一位余数之后不再参与比较
24, "", N, L, 39  // 计算完成，接下来把多余的记号擦掉
24, other, N, R

25, "Q", N, R, 26
25, other, N, L

26, "A", "0", L, 27
26, other, N, R

27, "0'", "0", L
27, "1'", "1", L
27, "", N, R, 56  // 开始计算商的下一位
27, other, N, L

60, "0~", "0", R
60, "1~", "1", R
60, "", N, L, 61  // 已经把商区所有用于比较的记号擦掉了，接下来去商区填一个1
60, other, N, R

61, "Q", N, R, 28
61, other, N, L

28, "A", "1", L, 29  // 接下来让商减掉除数
28, other, N, R

29, "Q", N, L, 59
29, other, N, L

59, "", N, R, 30
59, "0", "0'", L
59, "1", "1'", L
59, other, N, L

// 执行减法，让余数区的特定部分减去除数
30, "0'", "0", R, 31
30, "1'", "1", R, 32
30, "Q", N, R, 36  // 减法已经完成，接下来去余数区固定一位
30, other, N, R

31, "R", N, R, 33
31, other, N, R

32, "R", N, R, 34
32, other, N, R

33, "0", "0~", L, 35
33, "1", "1~", L, 35
33, other, N, R

34, "0", "1~", L, 62  // 0 - 1，接下来到高位减1
34, "1", "0~", L, 35
34, other, N, R

62, "0'", "1'", L
62, "1'", "0'", L, 35
62, "R", N, N, error  // 已经没有更高位了，但还要减1。抛出异常

35, "", N, R, 30
35, other, N, L

// 去余数区固定一位，并把多余的记号擦掉
36, "R", N, R, 37
36, other, N, R

37, "0~", "0'", R, 63
37, "1~", "1'", R, 63
37, other, N, R

63, "0~", "0", R
63, "1~", "1", R
63, "", N, L, 38
63, other, N, R

38, "", N, R, 56  // 开始计算商的下一位
38, other, N, L

39, "0'", "0", L
39, "1'", "1", L
39, "0~", "0", L
39, "1~", "1", L
39, "A", "", L
39, "R", "", L
39, "Q", "", L
39, "P", "", N, end
39, other, N, L`;

examples["binary-division"]["code"]["en"] = `// Binary division

start, "", "P", R, 2  // Add left marker to dividend
start, other, N, R

2, "", N, R, 3
2, other, N, R

3, "0", N, R, 4
3, "1", N, R, 4
3, other, N, R

4, "", "Q", R, 40  // Add right marker to divisor
4, other, N, R

40, "", "A", L, 5  // Fill a placeholder for quotient
40, other, N, N, error

5, "P", N, R, 6
5, other, N, L

6, "0", "0'", R, 7  // Found 0, next move to dividend area to add a quotient placeholder
6, "1", "1'", R, 7  // Found 1, next move to dividend area to add a quotient placeholder
6, "", N, R, 41  // Found blank, indicating quotient placeholders as long as dividend have been filled, next remove quotient placeholders as long as divisor
6, other, N, R

// Move right to quotient area
7, "Q", N, R, 8
7, other, N, R

// Move right to blank to add quotient placeholder
8, "", "A", L, 5  // Add quotient placeholder
8, other, N, R

41, "0", "0'", R, 42
41, "1", "1'", R, 42
41, "A", N, R, 10  // Removed quotient placeholders as many as divisor digits, next start transferring dividend to remainder area
41, "", N, N, 45  // Dividend has fewer digits than divisor, quotient is 0, remainder is dividend
41, other, N, R

42, "", N, L, 43
42, other, N, R

43, "A", "", L, 44
43, "Q", N, R, 45  // Dividend has fewer digits than divisor, quotient is 0, remainder is dividend

45, "", "0", R, 46
45, other, N, N, error

46, "", "R", L, 47
46, other, N, N, error

47, "P", N, R, 48
47, other, N, L

48, "0'", "0", R, 49  // Found 0 in dividend area, next transfer it to remainder area
48, "1'", "1", R, 50  // Found 1 in dividend area, next transfer it to remainder area
48, "", N, L, 53  // Dividend completely transferred to remainder area, calculation ends
48, other, N, R

49, "R", N, R, 51
49, other, N, R

50, "R", N, R, 52
50, other, N, R

51, "", "0", L, 47
51, other, N, R

52, "", "1", L, 47
52, other, N, R

53, "P", "", R, 54
53, other, N, L

54, "0'", "0", R  // Erase special marker
54, "1'", "1", R  // Erase special marker
54, "Q", "", R  // Erase special marker
54, "R", "", N, end  // All special markers erased, program ends
54, other, N, R

44, "", N, R, 41
44, other, N, L

10, "", "R", L, 11  // Add right marker to quotient
10, other, N, R

// Move left to P
11, "", N, L, 55
11, "0'", "0", L
11, "1'", "1", L
11, other, N, L

55, "P", N, R, 12
55, other, N, L

12, "", N, R, 17  // Found blank, indicating dividend completely transferred to remainder area, next start calculating highest bit of quotient
12, "0'", "0", R, 13  // Found 0, next go to remainder area to fill a 0
12, "1'", "1", R, 14  // Found 1, next go to remainder area to fill a 1
12, other, N, R  // Continue searching

13, "R", N, R, 15
13, other, N, R

14, "R", N, R, 16
14, other, N, R

15, "", "0", L, 11  // Fill 0 in remainder area
15, other, N, R

16, "", "1", L, 11  // Fill 1 in remainder area
16, other, N, R

// Check if quotient has undetermined bits
56, "A", N, R, 64  // Detected undetermined bit
56, "R", N, R, 65  // Quotient has no undetermined bits, calculation completed
56, other, N, R

// Move to far right
65, "", N, L, 39
65, other, N, R

// Check if high bit of remainder area has 1, if so, fill a 1 in quotient area
64, "1'", N, L, 57
64, "", N, L, 58  // High bit of remainder area has no 1, next perform regular comparison
64, other, N, R

57, "Q", N, R, 28  // Next fill a 1 in quotient area
57, other, N, L

58, "", N, R, 17
58, other, N, L

// Compare divisor with the part to be compared in remainder area
17, "0", "0'", R, 18  // Got 0, next go to remainder area for comparison
17, "1", "1'", R, 19  // Got 1, next go to remainder area for comparison
17, "Q", N, R, 60  // Encountered Q, indicating comparison completed, divisor is not greater than the part to be compared in remainder area, next erase comparison markers in remainder area, then fill a 1 in quotient area
17, other, N, R

18, "R", N, R, 20
18, other, N, R

19, "R", N, R, 21
19, other, N, R

20, "0", "0~", L, 22  // Next compare next bit
20, "1", "1~", L, 22  // Next compare next bit
20, "", N, L, 39  // Divisor digits exceed unfixed bits in remainder, calculation completed, next erase excess markers
20, other, N, R

21, "0", N, L, 23  // Divisor is greater than or equal to the part being compared in remainder, next fill a 0 in quotient
21, "1", "1~", L, 22  // Next compare next bit
21, "", N, L, 39  // Divisor digits exceed unfixed bits in remainder, calculation completed, next erase excess markers
21, other, N, R

22, "", N, R, 17
22, other, N, L

23, "0~", "0", L
23, "1~", "1", L
23, "R", N, R, 24
23, other, N, L

24, "0", "0'", L, 25  // Mark this remainder bit to no longer participate in comparison
24, "1", "1'", L, 25  // Mark this remainder bit to no longer participate in comparison
24, "", N, L, 39  // Calculation completed, next erase excess markers
24, other, N, R

25, "Q", N, R, 26
25, other, N, L

26, "A", "0", L, 27
26, other, N, R

27, "0'", "0", L
27, "1'", "1", L
27, "", N, R, 56  // Start calculating next bit of quotient
27, other, N, L

60, "0~", "0", R
60, "1~", "1", R
60, "", N, L, 61  // Erased all comparison markers in quotient area, next go to quotient area to fill a 1
60, other, N, R

61, "Q", N, R, 28
61, other, N, L

28, "A", "1", L, 29  // Next subtract divisor from quotient
28, other, N, R

29, "Q", N, L, 59
29, other, N, L

59, "", N, R, 30
59, "0", "0'", L
59, "1", "1'", L
59, other, N, L

// Perform subtraction, subtract divisor from specific part of remainder area
30, "0'", "0", R, 31
30, "1'", "1", R, 32
30, "Q", N, R, 36  // Subtraction completed, next fix a bit in remainder area
30, other, N, R

31, "R", N, R, 33
31, other, N, R

32, "R", N, R, 34
32, other, N, R

33, "0", "0~", L, 35
33, "1", "1~", L, 35
33, other, N, R

34, "0", "1~", L, 62  // 0 - 1, next subtract 1 from higher bit
34, "1", "0~", L, 35
34, other, N, R

62, "0'", "1'", L
62, "1'", "0'", L, 35
62, "R", N, N, error  // No higher bit left, but still need to subtract 1. Throw exception

35, "", N, R, 30
35, other, N, L

// Go to remainder area to fix a bit, and erase excess markers
36, "R", N, R, 37
36, other, N, R

37, "0~", "0'", R, 63
37, "1~", "1'", R, 63
37, other, N, R

63, "0~", "0", R
63, "1~", "1", R
63, "", N, L, 38
63, other, N, R

38, "", N, R, 56  // Start calculating next bit of quotient
38, other, N, L

39, "0'", "0", L
39, "1'", "1", L
39, "0~", "0", L
39, "1~", "1", L
39, "A", "", L
39, "R", "", L
39, "Q", "", L
39, "P", "", N, end
39, other, N, L`;

examples["binary-division"]["style"] = {};

examples["binary-division"]["style"]["zh"] = `P, white, red  // 被除数左侧记号
Q, white, green  // 除数右侧记号
R, white, blue  // 商右侧记号
A, white, gray  // 商占位记号
0', brown
0~, brown  // 余数已比较部分
1', brown
1~, brown  // 余数已比较部分`;

examples["binary-division"]["style"]["en"] = `P, white, red  // Marker on the left of the dividend
Q, white, green  // Marker on the right of the divisor
R, white, blue  // Marker on the right of the quotient
A, white, gray  // Placeholder for the quotient
0', brown
0~, brown  // Part of the remainder that has been compared
1', brown
1~, brown  // Part of the remainder that has been compared`;

examples["binary-division"]["tapes"] = [  // 样例初始纸带
    ["", "1", "0", "1", "1", "1", "", "1", "1", "0", "", "", "", "", "", "", "", "", "", "", "", "", ""],  // 正确答案：11余101
    ["", "1", "0", "1", "", "1", "1", "", "", "", "", "", "", "", "", "", "", ""],  // 正确答案：1余10
    ["", "1", "1", "", "1", "0", "", "", "", "", "", "", "", "", "", "", ""],  // 正确答案：1余1
    ["", "1", "", "1", "0", "", "", "", "", "", "", "", "", "", "", ""]  // 正确答案：0余1
];

examples["binary-division"]["embedding"] = {
    "2": [
      -2.8874831920349613,
      -1.9344903606121904
    ],
    "3": [
      -2.760821879709207,
      -1.5045389269999934
    ],
    "4": [
      -3.097910653486946,
      -1.295822735794486
    ],
    "5": [
      -2.698178117419797,
      -0.5132943231108607
    ],
    "6": [
      -2.351946930003495,
      -0.12247692506236924
    ],
    "7": [
      -2.727991162584123,
      0.09087796654956921
    ],
    "8": [
      -3.0191186801871313,
      -0.215197467018952
    ],
    "10": [
      -1.6901640030509635,
      0.3932779274152878
    ],
    "11": [
      -1.5231105221102144,
      1.040668995464138
    ],
    "12": [
      -0.4738336265994949,
      1.2392206022847179
    ],
    "13": [
      -0.8292641506234494,
      1.7103197197446114
    ],
    "14": [
      -0.682981024958966,
      0.7814474565365364
    ],
    "15": [
      -1.3438869333906733,
      1.6233605801150013
    ],
    "16": [
      -1.1690646333474284,
      0.7581269783833734
    ],
    "17": [
      0.25823995253260695,
      1.1920558696639154
    ],
    "18": [
      0.08517312723363381,
      1.8055355069803376
    ],
    "19": [
      0.6900229693911671,
      1.3266096856010297
    ],
    "20": [
      0.5488839575447866,
      2.086313960084572
    ],
    "21": [
      1.0797658388321036,
      1.6869993292565026
    ],
    "22": [
      0.5697165838966226,
      1.6656034142428027
    ],
    "23": [
      1.774431346778525,
      1.7761710910081265
    ],
    "24": [
      1.929299406796412,
      2.277928076130661
    ],
    "25": [
      2.393942115957211,
      2.1491155799895125
    ],
    "26": [
      2.641938764686298,
      1.6896353837113023
    ],
    "27": [
      2.4905264973746735,
      1.1213572241003515
    ],
    "28": [
      0.7236610555939037,
      -0.2450510000444598
    ],
    "29": [
      0.611561228737434,
      -0.7649577685577742
    ],
    "30": [
      1.5666573560226107,
      -1.4272918550019271
    ],
    "31": [
      1.3349812857098158,
      -1.8887038867352173
    ],
    "32": [
      2.1050187560083997,
      -1.3369176844394086
    ],
    "33": [
      1.6452979942076906,
      -2.2095586780185417
    ],
    "34": [
      2.3532082842426063,
      -1.7502372855849424
    ],
    "35": [
      1.9194929239978593,
      -1.9118464116929272
    ],
    "36": [
      1.7933456914385122,
      -0.8714894383732786
    ],
    "37": [
      2.1056826376965376,
      -0.4280409450082682
    ],
    "38": [
      2.1535670409843712,
      0.3625186720149
    ],
    "39": [
      1.2332479771780638,
      2.2483888738009212
    ],
    "40": [
      -3.043324192447069,
      -0.8445993068878918
    ],
    "41": [
      -1.7349013940271458,
      -0.2012177305762389
    ],
    "42": [
      -1.3973250631418983,
      -0.167749191954036
    ],
    "43": [
      -1.4236766109130141,
      -0.636222847311873
    ],
    "44": [
      -1.788632539582256,
      -0.7100374045560249
    ],
    "45": [
      -1.1323364948604835,
      -0.492583060568803
    ],
    "46": [
      -0.8462134844142675,
      -0.9140228440821426
    ],
    "47": [
      -0.8690152928623115,
      -1.463320568876715
    ],
    "48": [
      -0.7070903995939074,
      -1.9821307336149758
    ],
    "49": [
      -0.2872334520233863,
      -1.8192507091103625
    ],
    "50": [
      -1.2068074896624819,
      -2.064750270211336
    ],
    "51": [
      -0.4232589352222091,
      -1.4085241221357514
    ],
    "52": [
      -1.3056452791415791,
      -1.6647153511345876
    ],
    "53": [
      -0.42317153532982543,
      -2.4705325063302994
    ],
    "54": [
      0.09394391291488285,
      -2.753468729128748
    ],
    "55": [
      -0.9601450051762613,
      1.115140254982855
    ],
    "56": [
      1.8460099789864277,
      0.9159302739286134
    ],
    "57": [
      1.1113166254423126,
      0.13775357300693206
    ],
    "58": [
      0.7662651808892871,
      0.8053679663026309
    ],
    "59": [
      0.9498054234138553,
      -1.2407649953876494
    ],
    "60": [
      0.10576096120054398,
      0.5499855984051019
    ],
    "61": [
      0.32894287583233006,
      0.04257275371916279
    ],
    "62": [
      2.2910394750374783,
      -2.194834050794528
    ],
    "63": [
      2.446479627716884,
      -0.12332689992418296
    ],
    "64": [
      1.293073145588078,
      0.6395523057453739
    ],
    "65": [
      1.478377767194858,
      1.4671044228227192
    ],
    "start": [
      -2.54496882157654,
      -2.1941681618983346
    ],
    "self-connection-0": [
      -3.1749826707458397,
      -2.0372649378872136
    ],
    "self-connection-1": [
      -2.463396837740667,
      -1.4374615346426032
    ],
    "self-connection-2": [
      -3.391244667625264,
      -1.400488840239934
    ],
    "self-connection-3": [
      -2.4912164736242572,
      -0.7376863657598837
    ],
    "self-connection-4": [
      -2.3036588284349695,
      0.1553604535052423
    ],
    "self-connection-5": [
      -2.8575925253944185,
      0.38212386377003765
    ],
    "self-connection-6": [
      -3.312009054962853,
      -0.11831135347768561
    ],
    "self-connection-7": [
      -1.952386191806976,
      0.4511510562097589
    ],
    "self-connection-8": [
      -1.4528123613209174,
      1.2740788478659257
    ],
    "self-connection-9": [
      -1.835647454512547,
      1.2594402922774655
    ],
    "self-connection-10": [
      -1.8276140365237492,
      0.9024147528610893
    ],
    "self-connection-11": [
      -0.3767515068318759,
      1.499287575652961
    ],
    "self-connection-12": [
      -0.8105268242613988,
      2.015623905644765
    ],
    "self-connection-13": [
      -0.6598805296836205,
      0.4754238014704339
    ],
    "self-connection-14": [
      -1.4851083817346722,
      1.9001670553205223
    ],
    "self-connection-15": [
      -1.2255475311594912,
      0.5057395583728607
    ],
    "self-connection-16": [
      -0.005928729885071464,
      1.183244900392342
    ],
    "self-connection-17": [
      -0.13286108506041858,
      2.04071506388263
    ],
    "self-connection-18": [
      0.8541621236588981,
      1.1209067071746939
    ],
    "self-connection-19": [
      0.3629873649773766,
      2.356879871397131
    ],
    "self-connection-20": [
      1.0943910411317204,
      1.4251628119268138
    ],
    "self-connection-21": [
      0.325843112532729,
      1.6497284328865134
    ],
    "self-connection-22": [
      2.020510239007015,
      1.9373957411954923
    ],
    "self-connection-23": [
      1.8050106896961513,
      1.4652105747841486
    ],
    "self-connection-24": [
      2.05587148273427,
      1.6544215036714016
    ],
    "self-connection-25": [
      2.044060589213811,
      2.5962254805804434
    ],
    "self-connection-26": [
      2.622267996717695,
      2.3516742207537846
    ],
    "self-connection-27": [
      2.9366102770022686,
      1.7660012474995446
    ],
    "self-connection-28": [
      2.3405740098678827,
      1.3403672281229848
    ],
    "self-connection-29": [
      2.6097188402566096,
      0.8094222947367742
    ],
    "self-connection-30": [
      2.8452188806046483,
      1.136972941345522
    ],
    "self-connection-31": [
      0.9477097804398075,
      -0.41559308830038283
    ],
    "self-connection-32": [
      0.31105521532805963,
      -0.7201324501601092
    ],
    "self-connection-33": [
      1.4589515151329424,
      -1.2282430402612656
    ],
    "self-connection-34": [
      1.0809709443599917,
      -2.080576703535711
    ],
    "self-connection-35": [
      2.329305710584669,
      -1.1294523693468703
    ],
    "self-connection-36": [
      1.5573740552631332,
      -2.5030623112278576
    ],
    "self-connection-37": [
      2.658741362276336,
      -1.6722441559793837
    ],
    "self-connection-38": [
      1.8856133107447097,
      -1.6703012858088704
    ],
    "self-connection-39": [
      1.5632041970463872,
      -0.693516487117167
    ],
    "self-connection-40": [
      1.8828939899935337,
      -0.27116826546358624
    ],
    "self-connection-41": [
      1.9343328705908112,
      0.22663995046031377
    ],
    "self-connection-42": [
      1.3636105095943163,
      1.9257983154683394
    ],
    "self-connection-43": [
      1.5496636361635001,
      2.3959179390884295
    ],
    "self-connection-44": [
      1.3858099119219656,
      2.5657580455854685
    ],
    "self-connection-45": [
      1.051484487744932,
      1.9885142817685646
    ],
    "self-connection-46": [
      1.5313346566474217,
      2.125554566657438
    ],
    "self-connection-47": [
      0.9684550741120062,
      2.4530617666726364
    ],
    "self-connection-48": [
      0.9000059655002828,
      2.212160685241276
    ],
    "end_from_36": [
      1.4114356480401895,
      2.8644531493880674
    ],
    "self-connection-49": [
      0.9869099658919895,
      2.664097737723182
    ],
    "error_from_37": [
      -3.4556593710507792,
      -0.7473615768116512
    ],
    "self-connection-50": [
      -1.972864234180883,
      -0.31954559588233616
    ],
    "self-connection-51": [
      -1.1743860493059486,
      0.026266068153920165
    ],
    "self-connection-52": [
      -1.9036690146583952,
      -0.9958853891048157
    ],
    "error_from_42": [
      -0.745007252780597,
      -0.2671159554677917
    ],
    "error_from_43": [
      -0.4710494236496809,
      -0.7410421197466057
    ],
    "self-connection-53": [
      -1.083075748440435,
      -1.2583862053847583
    ],
    "self-connection-54": [
      -0.8304132481377435,
      -2.2070456292103664
    ],
    "self-connection-55": [
      0.022977221959201554,
      -1.8365785933257075
    ],
    "self-connection-56": [
      -1.4417009647885468,
      -2.2778992903963835
    ],
    "self-connection-57": [
      -0.16699942284550726,
      -1.2378367881250838
    ],
    "self-connection-58": [
      -1.6139314467075276,
      -1.6151208119179263
    ],
    "self-connection-59": [
      -0.6396418056110402,
      -2.6998257725418737
    ],
    "self-connection-60": [
      -0.1687811467624198,
      -2.9887882293350603
    ],
    "self-connection-61": [
      0.3320918134384772,
      -2.484639054477026
    ],
    "self-connection-62": [
      -0.0241163324906656,
      -2.443759095087847
    ],
    "end_from_51": [
      0.1774843202444535,
      -3.250521869278199
    ],
    "self-connection-63": [
      0.4300144697687442,
      -2.8699177183766817
    ],
    "self-connection-64": [
      -0.9558233473959589,
      1.3610654374360636
    ],
    "self-connection-65": [
      2.057998057950467,
      0.825660319719864
    ],
    "self-connection-66": [
      1.3290055692826779,
      -0.045415129334909
    ],
    "self-connection-67": [
      0.8184107458572071,
      0.5476293616170089
    ],
    "self-connection-68": [
      0.580297567741049,
      -1.3078518760892417
    ],
    "self-connection-69": [
      1.0490453764393421,
      -0.9616940249402485
    ],
    "self-connection-70": [
      0.897486001674706,
      -1.543064578237022
    ],
    "self-connection-71": [
      -0.15425344625415413,
      0.710356066020649
    ],
    "self-connection-72": [
      -0.10004007533541645,
      0.27480163299177
    ],
    "self-connection-73": [
      0.3316410303138955,
      0.6877423097664268
    ],
    "self-connection-74": [
      0.550329511014305,
      0.14229469616747656
    ],
    "self-connection-75": [
      2.6105414792024537,
      -2.2954539235900056
    ],
    "error_from_59": [
      2.179842664661617,
      -2.625307446347756
    ],
    "self-connection-76": [
      2.5093162178490824,
      -0.47766146609799803
    ],
    "self-connection-77": [
      2.798362669431293,
      -0.23118445895685513
    ],
    "self-connection-78": [
      2.6186225832872463,
      0.1505643423852749
    ],
    "self-connection-79": [
      1.5050221783081026,
      0.5064955952368395
    ],
    "self-connection-80": [
      1.4506520990217397,
      1.1655901512625781
    ],
    "self-connection-81": [
      -2.503146218124092,
      -2.4895306091588614
    ]
  };
