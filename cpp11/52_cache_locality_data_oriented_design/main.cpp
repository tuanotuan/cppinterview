#include <cstddef>
#include <iostream>
#include <vector>

int main() {
    // Structure of arrays: the hot loop touches contiguous fields only.
    std::vector<double> x{0.0, 10.0, 20.0};
    std::vector<double> y{1.0, 11.0, 21.0};
    std::vector<double> velocity_x{2.0, 2.0, 2.0};
    std::vector<double> velocity_y{3.0, 3.0, 3.0};

    double checksum = 0.0;
    for (std::size_t i = 0; i < x.size(); ++i) {
        x[i] += velocity_x[i];
        y[i] += velocity_y[i];
        checksum += x[i] + y[i];
    }

    std::cout << "checksum=" << checksum << '\n';
}
