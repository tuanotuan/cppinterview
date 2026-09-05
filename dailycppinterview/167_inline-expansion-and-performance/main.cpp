// Real-World C++ Interviews Q167: How does inline expansion of functions affect performance?
// Key: Inlining can remove call overhead and expose constants and control flow to further
// optimization, but duplicating a body can increase code size and instruction-cache pressure.
// The optimizer may inline a function without the `inline` specifier or decline to inline one
// that has it; the keyword's guaranteed language role is primarily to permit identical
// definitions across translation units under the ODR. Performance decisions should therefore be
// based on optimized builds and measurement, not the keyword alone.
#include <iostream>

inline constexpr int square(int value) {
    return value * value;
}

int main() {
    static_assert(square(5) == 25);
    std::cout << square(7) << std::endl;
}
