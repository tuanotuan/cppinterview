// Real-World C++ Interviews Q154: What is a recursive function? Provide an example.
// Key: A recursive function invokes itself directly or indirectly on a smaller subproblem. It
// needs a reachable base case and progress toward that case; otherwise it recurses
// indefinitely, and even correct deep recursion can exhaust the call stack. C++ does not
// guarantee tail-call optimization, so an iterative algorithm or explicit stack is safer when
// depth can be large or controlled by input.
#include <cstdint>
#include <iostream>

constexpr std::uint64_t factorial(unsigned value) {
    return value < 2 ? 1 : value * factorial(value - 1);
}

int main() {
    static_assert(factorial(5) == 120);
    std::cout << factorial(6) << std::endl;
}
