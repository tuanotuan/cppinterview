#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3, 4};
    std::vector<int> squares(values.size());

    std::transform(values.begin(), values.end(), squares.begin(),
                   [](auto value) { return value * value; });
    const auto even_count = std::count_if(
        squares.begin(), squares.end(),
        [](auto value) { return value % 2 == 0; });

    std::cout << "squares:";
    for (int value : squares) std::cout << ' ' << value;
    std::cout << "\neven count: " << even_count << "\n";
}
