#include <iostream>
#include <numeric>
#include <vector>

int main() {
    const std::vector<double> values{2.0, 4.0, 6.0, 8.0};
    const double count = static_cast<double>(values.size());
    const double sum = std::accumulate(values.begin(), values.end(), 0.0);
    const double sum_squares = std::inner_product(
        values.begin(), values.end(), values.begin(), 0.0);

    const double mean = sum / count;
    const double variance = sum_squares / count - mean * mean;
    std::cout << "mean: " << mean << "\n";
    std::cout << "population variance: " << variance << "\n";
}
