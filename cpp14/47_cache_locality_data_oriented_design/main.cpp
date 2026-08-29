#include <cstddef>
#include <iostream>
#include <vector>

int main() {
    std::vector<double> positions{0.0, 10.0, 20.0};
    const std::vector<double> velocities{1.5, -2.0, 0.5};
    const double time_step = 2.0;

    for (std::size_t i = 0; i < positions.size(); ++i) {
        positions[i] += velocities[i] * time_step;
    }

    std::cout << "positions:";
    for (double value : positions) std::cout << ' ' << value;
    std::cout << "\n";
}
