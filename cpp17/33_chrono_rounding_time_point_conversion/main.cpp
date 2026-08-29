#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;
    const milliseconds value{1501};

    std::cout << "floor: " << floor<seconds>(value).count() << '\n';
    std::cout << "ceil: " << ceil<seconds>(value).count() << '\n';
    std::cout << "round: " << round<seconds>(value).count() << '\n';

    const steady_clock::time_point point{value};
    const auto cast_point = time_point_cast<seconds>(point);
    std::cout << "time point: "
              << cast_point.time_since_epoch().count() << '\n';
}
