#include <iostream>

int main() {
#if defined(__cpp_explicit_this_parameter)
    auto factorial = [](this auto self, int n) -> int {
        return n < 2 ? 1 : n * self(n - 1);
    };

    std::cout << "5!=" << factorial(5) << '\n';
#else
    std::cout << "recursive deducing-this lambda unavailable\n";
#endif
}
