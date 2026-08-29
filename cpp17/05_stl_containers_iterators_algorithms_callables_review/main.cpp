#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{1, 2, 3, 4, 5, 6};
    const auto logical_end = std::remove_if(
        values.begin(), values.end(),
        [](int value) { return value % 2 != 0; });
    values.erase(logical_end, values.end());

    std::transform(values.begin(), values.end(), values.begin(),
                   [](int value) { return value * value; });
    std::cout << "squares:";
    for (int value : values) std::cout << ' ' << value;
    std::cout << '\n';
}
