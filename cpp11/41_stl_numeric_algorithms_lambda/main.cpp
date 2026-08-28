#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> values{5, 2, 4, 1, 3};

    std::sort(values.begin(), values.end());
    const int even_count = std::count_if(
        values.begin(), values.end(),
        [](int value) { return value % 2 == 0; });
    const int total = std::accumulate(values.begin(), values.end(), 0);

    std::cout << "first=" << values.front() << '\n';
    std::cout << "even=" << even_count << '\n';
    std::cout << "total=" << total << '\n';
}
