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
