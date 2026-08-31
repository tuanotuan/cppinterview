#include <array>
#include <deque>
#include <iostream>
#include <vector>
#include <version>

int main() {
#if defined(__cpp_lib_containers_ranges)
    std::vector<int> values;
    values.assign_range(std::array{2, 3});
    values.insert_range(values.begin(), std::array{1});
    values.append_range(std::array{4});

    std::deque<int> result(values.begin(), values.end());
    result.prepend_range(std::array{0});

    for (int value : result)
        std::cout << value << ' ';
    std::cout << '\n';
#else
    std::cout << "container range operations unavailable\n";
#endif
}
