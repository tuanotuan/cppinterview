#include <iostream>

#if defined(__cpp_static_call_operator) && __cpp_static_call_operator >= 202207L
struct Scale {
    static int operator()(int value) {
        return value * 2;
    }

    static int operator[](int value) {
        return value * 3;
    }
};
#endif

int main() {
#if defined(__cpp_static_call_operator) && __cpp_static_call_operator >= 202207L
    auto square = [](int value) static { return value * value; };
    std::cout << square(4) << ' ' << Scale{}(4) << ' ' << Scale{}[4] << '\n';
#else
    std::cout << "static call operators unavailable\n";
#endif
}
