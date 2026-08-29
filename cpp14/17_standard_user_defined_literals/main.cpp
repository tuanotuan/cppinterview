#include <chrono>
#include <complex>
#include <iostream>
#include <string>

int main() {
    using namespace std::string_literals;
    using namespace std::chrono_literals;
    using namespace std::complex_literals;

    const auto text = "C++14"s;
    const auto delay = 250ms;
    const auto imaginary = 2.0i;

    std::cout << "text: " << text << "\n";
    std::cout << "milliseconds: " << delay.count() << "\n";
    std::cout << "imaginary: " << imaginary.imag() << "\n";
}
