#include <functional>
#include <iostream>
#include <version>

int main() {
#if defined(__cpp_lib_invoke_r)
    long result = std::invoke_r<long>(std::plus<>{}, 2, 3);
#else
    long result = std::plus<>{}(2, 3);
#endif
    std::cout << "invoke_r=" << result << '\n';

#if defined(__cpp_lib_bind_back)
    auto add_ten = std::bind_back(std::plus<>{}, 10);
    std::cout << "bind_back=" << add_ten(5) << '\n';
#else
    std::cout << "bind_back unavailable\n";
#endif
}
