#include <iomanip>
#include <iostream>

template <class T>
constexpr T pi = T(3.1415926535897932385L);

int main() {
    const double radius = 2.0;
    const double area = pi<double> * radius * radius;

    std::cout << std::fixed << std::setprecision(3);
    std::cout << "area: " << area << "\n";
}
