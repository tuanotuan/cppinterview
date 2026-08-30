// Day 50: Cache Locality, Data-Oriented Design, and assume_aligned
#include <iostream>
#include <memory>
#include <vector>

int main() {
    std::vector<double> x{1.0, 2.0, 3.0, 4.0};
    std::vector<double> y{10.0, 20.0, 30.0, 40.0};

    // vector storage satisfies at least the natural alignment of double.
    double* aligned_x = std::assume_aligned<alignof(double)>(x.data());
    double total = 0.0;

    for (std::size_t i = 0; i < x.size(); ++i) {
        total += aligned_x[i] + y[i]; // Sequential, contiguous access.
    }

    std::cout << "total = " << total << '\n';
}
