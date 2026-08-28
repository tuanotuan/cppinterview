#include <iostream>

class Config {
public:
    Config() : Config(80) {} // delegates to the main constructor

    explicit Config(int port) : port_(port) {}

    void print() const {
        std::cout << "port=" << port_ << " secure=" << secure_ << '\n';
    }

private:
    int port_ = 80;       // non-static member initializer
    bool secure_ = false;
};

int main() {
    Config defaults;
    Config custom(443);
    defaults.print();
    custom.print();
}
