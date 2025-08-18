class Hlvm < Formula
  desc "High-Level Virtual Machine - System automation and AI integration"
  homepage "https://github.com/hlvm-dev/hlvm"
  version "0.0.6"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/hlvm-dev/hlvm/releases/download/v#{version}/hlvm-macos-arm64"
      sha256 "placeholder_sha256_arm64"
    else
      url "https://github.com/hlvm-dev/hlvm/releases/download/v#{version}/hlvm-macos-x64"
      sha256 "placeholder_sha256_x64"
    end
  end

  on_linux do
    url "https://github.com/hlvm-dev/hlvm/releases/download/v#{version}/hlvm-linux-x64"
    sha256 "placeholder_sha256_linux"
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "hlvm-macos-arm64" => "hlvm"
      else
        bin.install "hlvm-macos-x64" => "hlvm"
      end
    elsif OS.linux?
      bin.install "hlvm-linux-x64" => "hlvm"
    end
  end

  test do
    system "#{bin}/hlvm", "--version"
  end
end
