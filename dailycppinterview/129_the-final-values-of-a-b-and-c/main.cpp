// Real-World C++ Interviews Q129: What are the final values of a, b and c?
// Key: The final values are `a == 9`, `b == 10`, and `c == 11`. Multiplication happens before
// addition, so `c` first becomes 10; postfix `c++` assigns that old value to `b` and then
// increments `c`.
#include <iostream>

int main() {
    int a, b, c;
    a = 9;
    c = a + 1 + 1 * 0;
    b = c++;
    std::cout << a << ' ' << b << ' ' << c << '\n';
}
