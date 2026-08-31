#include <iostream>
#include <utility>

int positive_square(int value) {
#if __has_cpp_attribute(assume) >= 202207L
    [[assume(value > 0)]];
#else
    if (value <= 0)
        std::unreachable();
#endif
    return value * value;
}

int main() {
    std::cout << positive_square(4) << '\n';
}
