#include <array>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::array<int, 3> fixed{{1, 2, 3}};
    std::vector<int> growing{4, 5, 6};
    int raw[]{7, 8};

    int sum = 0;
    for (int value : fixed) {
        sum += value;
    }
    for (int value : growing) {
        sum += value;
    }

    std::cout << "sum=" << sum << '\n';
    std::cout << "raw_size=" << std::end(raw) - std::begin(raw) << '\n';
}
