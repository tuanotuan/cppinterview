// Real-World C++ Interviews Q062: When constexpr functions are evaluated?
// Key: A `constexpr` function can run at compile time when called with suitable arguments in a
// context requiring a constant expression, but it may also run at runtime. `consteval` is the
// tool when compile-time evaluation is mandatory.
#include <iostream>

constexpr int square(int value) {
    return value * value;
}

int main(int argc, char**) {
    constexpr int compile_time = square(4);
    const int runtime = square(argc);
    std::cout << compile_time << ' ' << runtime << '\n';
}
