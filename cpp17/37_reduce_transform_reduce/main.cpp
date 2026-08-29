#include <iostream>
#include <numeric>
#include <vector>

int main() {
    const std::vector<int> left{1, 2, 3, 4};
    const std::vector<int> right{5, 6, 7, 8};

    const int total = std::reduce(left.begin(), left.end(), 0);
    const int dot = std::transform_reduce(
        left.begin(), left.end(), right.begin(), 0);

    std::cout << "sum: " << total << '\n';
    std::cout << "dot: " << dot << '\n';
}
