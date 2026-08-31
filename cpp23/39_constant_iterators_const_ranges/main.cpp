#include <iostream>
#include <iterator>
#include <type_traits>
#include <vector>
#include <version>

int main() {
    std::vector values{1, 2, 3};

#if defined(__cpp_lib_ranges_as_const)
    std::basic_const_iterator iterator{values.begin()};
    static_assert(std::is_same_v<decltype(*iterator), const int&>);
    std::cout << *iterator << '\n';
#else
    auto iterator = values.cbegin();
    static_assert(std::is_same_v<decltype(*iterator), const int&>);
    std::cout << *iterator << " (traditional cbegin)\n";
#endif
}
