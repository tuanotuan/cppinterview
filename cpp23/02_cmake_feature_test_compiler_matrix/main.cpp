#include <iostream>
#include <version>

int main() {
    std::cout << "C++ mode=" << __cplusplus << '\n';

#ifdef __cpp_if_consteval
    std::cout << "if consteval=" << __cpp_if_consteval << '\n';
#else
    std::cout << "if consteval=unavailable\n";
#endif

#ifdef __cpp_lib_expected
    std::cout << "expected=" << __cpp_lib_expected << '\n';
#else
    std::cout << "expected=unavailable\n";
#endif
}
