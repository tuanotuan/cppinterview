#include <iostream>

namespace simplify::course::math {

// The compact namespace header is equivalent to three nested blocks.
int square(int value) {
    return value * value;
}

} // namespace simplify::course::math

int main() {
    std::cout << "square: "
              << simplify::course::math::square(7) << '\n';
}
