#if defined(ENABLE_STD_MODULE_DEMO)
import std;

int main() {
    std::cout << "module result=" << (20 + 23) << '\n';
}
#else
#include <iostream>

int main() {
    std::cout << "header fallback result=" << (20 + 23) << '\n';
    std::cout << "standard module build not enabled\n";
}
#endif
