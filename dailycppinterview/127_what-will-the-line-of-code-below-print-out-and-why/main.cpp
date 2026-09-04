// Real-World C++ Interviews Q127: What will the line of code below print out and why?
// Key: `25u - 50` is evaluated as unsigned arithmetic because the signed operand converts to
// unsigned. The result wraps modulo `UINT_MAX + 1`, yielding `UINT_MAX - 24`—4294967271 only on
// a 32-bit `unsigned int`.
#include <iostream>
#include <limits>

int main() {
    const auto result = 25u - 50;
    std::cout << result << '\n';
    return result == std::numeric_limits<unsigned int>::max() - 24 ? 0 : 1;
}
