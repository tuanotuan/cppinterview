// Daily C++ Interview Q142: How many variables should you declare on a line?
// Key: Declare one variable per statement. It makes each type, pointer declarator, initializer,
// lifetime, and comment unambiguous and avoids the false impression that one initializer
// applies to every name.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(142) << '\n';
}
